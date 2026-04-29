using System;

//Q. What is the difference between an Abstract class and an Interface (atleast 4)?

namespace What_is_the_difference_between_an_Abstract_class_and_an_Interface
{
    class Program
    {
        static void Main(string[] args)
        {
            //IEmployee iemployee = new IEmployee();

            //Employee employee = new Employee();
        }
    }

    interface IEmployee
    {
        public void Salary();

    }

    public abstract class Employee
    {
        public abstract void Project();

        public void Role()
        {
            Console.WriteLine("Engineer");
        }
    }

    public abstract class Employee1
    {
        public Employee1()
        {

        }

        public abstract void Project1();

        public void Role1()
        {
            Console.WriteLine("Engineer1");
        }
    }

    //public class PermanentEmployee: Employee, Employee1
    //{

    //}

    interface IEmployee1
    {
        //public IEmployee1()
        //{

        //}

        public void Project1();
    }
  
    interface IEmployee2
    {
        //private void Project2();    
        
        private void Project3()
        {
            Console.WriteLine("Test");
        }
    }


    public class NewEmployee : IEmployee1, IEmployee2
    {
        public void Project1()
        {
            Console.WriteLine("Print 1");
        }

        public void Project2()
        {
            Console.WriteLine("Print 2");
        }
    }

    interface IEmployee5
    {
        void Project5();
    }

    //private interface Interface1
    //{


    //}

}

