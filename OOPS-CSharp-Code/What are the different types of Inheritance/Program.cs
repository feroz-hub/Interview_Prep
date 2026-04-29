using System;

namespace What_are_the_different_types_of_Inheritance
{
    class Program
    {
        static void Main(string[] args)
        {
            
        }

        //Single Inheritance - One Base class with one Derived class
        //Base/ Parent/ Super classes are same and Child/ Derived/ Subclasses are same.
        
        class BaseClass1
        {
            public void Animal()
            {
                Console.WriteLine("Animal");
            }
        }
        class DerivedClass1 : BaseClass1
        {
            public void Dog()
            {
                Console.WriteLine("Dog");
            }
        }


        //Multiple Inheritance - In this case Multiple Base classes can be there for single derived class.
        
        class BaseClass2
        {
            public void Animal()  
            {
                Console.WriteLine("Animal");
            }
        }
        interface I2
        {
            public void Fly();
        }
        class DerivedClass2 : BaseClass2, I2
        {
            public void Eagle()  
            { 
                Console.WriteLine("Eagle"); 
            }
            public void Fly()    
            {
                Console.WriteLine("Fly");
            }
        }


        // 	Multilevel inheritance – In this there is a GrandParent class,
        // 	then there is a Parent class which is derived from GrandParent class
        // 	and then there is Child class which is derived from Parent class.

        //Grandparent class -> Parent class -> Child class
        //Here the Child class will get the properties of both Parent class and GrandParent class automatically.

        class BaseClass3
        {
            public void Animal() 
            {
                Console.WriteLine("Animal");
            }
        }
        class DerivedClass3 : BaseClass2
        {
            public void Dog()  
            {
                Console.WriteLine("Dog");
            }
        }
        class DerivedClass4 : DerivedClass3
        {
            public void Labrador() 
            {
                Console.WriteLine("Labrador");
            }
        }


        // 	Hierarchal inheritance - In this One, child class is derived more from than one base class.
        // 	This is the most used type of inheritance.        
        
        class BaseClass4
        {
            public void Animal()   
            {
                Console.WriteLine("Animal");
            }
        }

        class DerivedClass5 : BaseClass4
        {
            public void Dog()     
            {
                Console.WriteLine("Dog");
            }
        }
        class DerivedClass6 : BaseClass4
        {
            public void Cat()     
            {
                Console.WriteLine("Dog");
            }
        }

    }
}
