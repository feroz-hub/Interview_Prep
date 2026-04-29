using System;

namespace What_is_a_Constructor_and_what_are_its_types
{
    class Program
    {
        static void Main(string[] args)
        {
            DefaultConstructor defaultConstructor = new DefaultConstructor();

            ParaConstructor paraConstructor = new ParaConstructor(100);

            StaticConstructor.Print();

            ////PrivateConstructor privateConstructor = new PrivateConstructor();

            CopyConstructor copyConstructor = new CopyConstructor("Happy");

            CopyConstructor copyConstructor1 = new CopyConstructor(copyConstructor);
            Console.WriteLine("Name: " + copyConstructor1.name);

            Console.ReadLine();
        }
    }

    //DEFAULT CONSTRUCTOR - A constructor without any parameters is a default constructor.
    public class DefaultConstructor
    {
        public DefaultConstructor()
        {
            Console.WriteLine("Default Constructor Invoked");
        }     
    }


    //PARAMETERIZED CONSTRUCTOR - A constructor with at least one parameter is a parameterized constructor.
    public class ParaConstructor
    {
        public ParaConstructor(int x)
        {
            Console.WriteLine("ParaConstructor numbers: " + x);
        }
    }

    // 	STATIC CONSTRUCTOR - Static constructor is used to be called before any static member of a class is called.
    public class StaticConstructor
    {
        //Static constructor
        static StaticConstructor()
        {
            Console.WriteLine("Static Constructor Invoked");
        }

        public static void Print()
        {
            Console.WriteLine("Static Print method called");
        }     
    }


    // 	PRIVATE CONSTRUCTOR - When a constructor is created with a private specifier,
    // 	it is not possible for other classes to derive from this class,
    // 	neither is it possible to create an instance of this class. 
    //  When to use it? - Singleton Pattern
    public class PrivateConstructor
    {
        //Static constructor
        private PrivateConstructor()
        {
            Console.WriteLine("Private Constructor Invoked");
        }
        
    }

    //COPY CONSTRUCTOR - The constructor which creates an object by copying variables
    //from another object is called a copy constructor.
    public class CopyConstructor
    { 
        public string name;       

        //Parametrized Constructor
        public CopyConstructor(string name)
        {
            this.name = name;            
        }

        //Copy Constructor
        public CopyConstructor(CopyConstructor copy)
        {
            name = copy.name;         
        }
    }

}
